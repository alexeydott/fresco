// Compare two mapbox style objects (plain JS) and apply the minimal set of
// mapbox-gl style calls so edits are reflected on the map instantly.
//
// Returns true if the change was applied incrementally.
// Returns false when a full `map.setStyle()` is required (structural change,
// unknown shape, or any error) — the caller then falls back to setStyle.

const same = (a, b)=>{
	if (a === b) return true
	if (a == null && b == null) return true
	if (a == null || b == null) return false
	return JSON.stringify(a) === JSON.stringify(b)
}

// Diff a single property group (layout/paint) between prev and next, applying
// the minimal set of calls:
//  - a key whose value changed -> set to the new value
//  - a key present in prev but removed in next -> reset to null
const applyPropertyGroup = (map, id, kind, prevGroup, nextGroup)=>{
	if (same(prevGroup, nextGroup)) return

	const setter = kind === 'layout'
		? (key, val) => map.setLayoutProperty(id, key, val)
		: (key, val) => map.setPaintProperty(id, key, val)

	const nextObj = nextGroup || {}
	const prevObj = prevGroup || {}

	Object.keys(nextObj).forEach(key => {
		if (same(prevObj[key], nextObj[key])) return
		try {
			setter(key, nextObj[key])
		} catch(e){
			// ignore per-property errors (e.g. transient spec mismatch)
		}
	})

	// reset properties that were removed
	Object.keys(prevObj).forEach(key => {
		if (key in nextObj) return
		try {
			setter(key, null)
		} catch(e){
			// ignore
		}
	})
}

const applyLayerProps = (map, id, prev, next)=>{
	applyPropertyGroup(map, id, 'layout', prev.layout, next.layout)
	applyPropertyGroup(map, id, 'paint', prev.paint, next.paint)

	// filter
	if (!same(prev.filter, next.filter)){
		try {
			map.setFilter(id, next.filter || null)
		} catch(e){
			// ignore
		}
	}
}

export default {
	apply: (map, prev, next)=>{
		if (!map) return false

		try {
			const prevLayers = prev.layers || []
			const nextLayers = next.layers || []

			// structural: layer count or id order changed -> full restyle
			if (prevLayers.length !== nextLayers.length) return false
			for (let i = 0; i < nextLayers.length; i++){
				if (prevLayers[i].id !== nextLayers[i].id) return false
				// a layer changing type/source/source-layer is structural
				if (prevLayers[i].type !== nextLayers[i].type) return false
				if (prevLayers[i].source !== nextLayers[i].source) return false
				if (prevLayers[i]['source-layer'] !== nextLayers[i]['source-layer']) return false
				// per-layer zoom bounds have no incremental setter -> restyle
				if (prevLayers[i].minzoom !== nextLayers[i].minzoom) return false
				if (prevLayers[i].maxzoom !== nextLayers[i].maxzoom) return false
			}

			// sources: any change -> full restyle (setSource diffing is less safe)
			if (!same(prev.sources, next.sources)) return false

			// background
			if (!same(prev.background, next.background)){
				if (next.background != null) map.setBackground(next.background)
			}

			// light
			if (!same(prev.light, next.light)){
				if (next.light != null) map.setLight(next.light)
			}

		// per-layer property updates
		for (let i = 0; i < nextLayers.length; i++){
			applyLayerProps(map, nextLayers[i].id, prevLayers[i], nextLayers[i])
		}

		return true
		} catch(e){
			return false
		}
	}
}
