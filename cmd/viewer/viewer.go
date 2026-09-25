//go:generate sh -c "cd ../..; npm run build"
//go:generate sh -c "cd ../../; go-bindata -nomemcopy -pkg=main -o=cmd/viewer/bindata.go -ignore=.DS_Store build/..."

package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path"
	"runtime"
	"strings"
	"time"
)

var Version = "version_not_set"
var bindAddress = flag.String("address", ":9000", "The network addresss with port to bind to.")

// ref: https://stackoverflow.com/questions/39320371/how-start-web-server-to-open-page-in-browser-in-golang
func open(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default:
		cmd = "xdg-open"
	}
	args = append(args, url)
	log.Printf("Opening browser via : %v %v", cmd, strings.Join(args, " "))
	return exec.Command(cmd, args...).Run()
}

func getUrl(address string) string {
	if strings.Index(address, ":") == 0 {
		return "http://localhost" + address
	}
	return "http://" + address
}

// spaHandler serves the embedded SPA. Known asset paths are served directly;
// any path that does not resolve to an asset (e.g. a client-side route such as
// /tegola or /styles/<id>) falls back to index.html so the router can handle
// it. Without this, a direct visit to a sub-route returns 404 in production.
func spaHandler() http.Handler {
	fs := AssetFileSystem()
	fileServer := http.FileServer(fs)
	index := path.Join(fs.Prefix, "index.html")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/")

		// known static asset -> serve it
		f, err := fs.Open(name)
		if err == nil {
			_ = f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// a path with an extension that is not a known asset -> real 404
		if ext := path.Ext(name); ext != "" {
			http.NotFound(w, r)
			return
		}

		// otherwise serve the SPA shell directly (not via FileServer, to avoid
		// its internal canonical-path redirect) so the client router can handle
		// client-side routes such as /tegola or /styles/<id>
		if b, err := Asset(index); err == nil {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write(b)
			return
		}

		http.NotFound(w, r)
	})
}

func main() {
	flag.Parse()
	http.Handle("/", spaHandler())
	log.Printf("Starting Viewer (%v) at %v", Version, *bindAddress)
	log.Println("ctrl-c to exit.")
	ctx, cancel := context.WithCancel(context.Background())
	go func(ctx context.Context) {
		select {
		case <-time.After(200 * time.Millisecond):
			// noopt
		case <-ctx.Done():
			return
		}

		err := open(getUrl(*bindAddress))
		if err != nil {
			log.Println(err)
		}
	}(ctx)
	if err := http.ListenAndServe(*bindAddress, nil); err != nil {
		cancel()
		log.Println("Got Error:", err)
	}
	<-time.After(1 * time.Minute)
	os.Exit(1)
}
