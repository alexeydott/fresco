const normalizeServerUrl = (url)=>{
	if (!url) return url

	let str = url.trim()
	if (str.length < 1) return str

	// strip trailing slashes
	while (str.length > 0 && str.substr(-1) === '/'){
		str = str.substr(0, str.length - 1)
	}

	// add scheme if missing
	if (str.indexOf('http') !== 0) str = `http://${str}`

	return str
}

const getCapabilitiesUrl = (serverUrl)=>{
	return `${serverUrl}/capabilities`
}

const getSourceUrl = (serverUrl, name)=>{
	return `${serverUrl}/capabilities/${name}.json`
}

const getSourceId = (name)=>{
	return `tegola-${name}`
}

// mapbox style v8 top-level center/zoom are used for the initial camera
const getCenter = (map)=>{
	const center = map.get('center')
	if (!center || center.size < 2) return null

	const obj = {
		center: [center.get(0), center.get(1)],
	}
	if (center.size >= 3) obj.zoom = center.get(2)
	return obj
}

export default {
	getCapabilitiesUrl,
	getCenter,
	getSourceId,
	getSourceUrl,
	normalizeServerUrl,
}
