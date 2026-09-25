import React from 'react'
import PropTypes from 'prop-types'
import {List, Map} from 'immutable'

// Live visual preview of a layer's paint. Renders an SVG sample for the layer
// type (background / fill / line / circle / symbol / heatmap / hillshade /
// raster / fill-extrusion) and gradient ramps for data-driven color properties.
// The sample reacts to the current paint values so edits show up immediately.

const F = {
	'#': '#00ACC1',
}

// ---- value inspection helpers (values are Immutable) ----

// returns array of [input, output] for a data-driven function (Map with stops)
const getStops = (value)=>{
	if (!Map.isMap(value)) return null
	const stops = value.get('stops')
	if (!stops || !stops.size) return null

	const arr = []
	stops.forEach((s)=>{
		if (List.isList(s) && s.size >= 2) arr.push([s.get(0), s.get(1)])
	})
	return arr.length ? arr : null
}

const isExpr = (value)=>{
	return List.isList(value)
}

// representative color: constant string, first color stop, or the function default
const colorOf = (layer, key, fallback)=>{
	const v = layer.getIn(['paint', key])
	if (v == null) return fallback
	if (typeof v === 'string') return v
	if (Map.isMap(v)){
		const stops = getStops(v)
		if (stops && typeof stops[0][1] === 'string') return stops[0][1]
		const def = v.get('color')
		if (def) return def
	}
	return fallback
}

// representative number: constant number or first numeric stop
const numOf = (layer, key, fallback)=>{
	const v = layer.getIn(['paint', key])
	if (typeof v === 'number') return v
	if (Map.isMap(v)){
		const stops = getStops(v)
		if (stops && typeof stops[0][1] === 'number') return stops[0][1]
	}
	return fallback
}

// css gradient across the given color stops (evenly spaced by index)
const rampGradient = (stops)=>{
	const n = stops.length
	const parts = stops.map((s, i)=>{
		const pos = n > 1 ? Math.round((i / (n - 1)) * 100) : 0
		return `${s[1]} ${pos}%`
	})
	return `linear-gradient(to right, ${parts.join(', ')})`
}

class LayerEditPreview extends React.Component {

	// data-driven color ramps: scan paint for function values that carry color stops
	renderRamps (){
		const {layer} = this.props
		const paint = layer.get('paint')
		if (!paint || !Map.isMap(paint)) return null

		const ramps = []
		paint.forEach((v, key)=>{
			if (!Map.isMap(v)) return
			const stops = getStops(v)
			if (!stops || stops.length < 2) return
			if (typeof stops[0][1] !== 'string') return
			ramps.push({key, stops, property: v.get('property') || 'zoom'})
		})

		if (!ramps.length) return null

		return (
			<div className="layer-preview-ramps">
				<div className="layer-preview-ramps-title">color ramp</div>
				{ramps.map(r => (
					<div className="layer-preview-ramp" key={r.key}>
						<div className="layer-preview-ramp-bar" style={{background: rampGradient(r.stops)}}/>
						<div className="layer-preview-ramp-meta">
							<span className="layer-preview-ramp-key">{r.key}</span>
							<span className="layer-preview-ramp-range">
								by {r.property} · {r.stops[0][0]} → {r.stops[r.stops.length - 1][0]}
							</span>
						</div>
					</div>
				))}
			</div>
		)
	}

	// small marker shown when the primary value is a data-driven expression we
	// cannot fully evaluate
	renderDynamic (value){
		if (!isExpr(value)) return null
		return <span className="layer-preview-dynamic" title="value is a data-driven expression">∿ dynamic</span>
	}

	// background
	renderBackground (){
		const {layer} = this.props
		const color = colorOf(layer, 'background-color', F['#'])
		const opacity = numOf(layer, 'background-opacity', 1)
		return (
			<div className="layer-preview-sample layer-preview-sample-fill" style={{background: color, opacity}}/>
		)
	}

	// fill / fill-outline
	renderFill (){
		const {layer} = this.props
		const color = colorOf(layer, 'fill-color', F['#'])
		const opacity = numOf(layer, 'fill-opacity', 0.6)
		const outline = colorOf(layer, 'fill-outline-color', color)
		const outlineW = numOf(layer, 'fill-outline-width', 0)
		const dynamic = isExpr(layer.getIn(['paint', 'fill-color']))

		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<polygon
						points="30,65 95,25 165,40 185,72 90,78"
						fill={color}
						fillOpacity={opacity}
						stroke={outline}
						strokeWidth={outlineW}
					/>
				</svg>
				{this.renderDynamic(dynamic)}
			</div>
		)
	}

	// line
	renderLine (){
		const {layer} = this.props
		const color = colorOf(layer, 'line-color', F['#'])
		const width = numOf(layer, 'line-width', 3)
		const opacity = numOf(layer, 'line-opacity', 1)
		const cap = layer.getIn(['layout', 'line-cap']) === 'round' ? 'round' : 'butt'
		const dash = layer.getIn(['paint', 'line-dasharray'])
		const dashStyle = (List.isList(dash) && dash.size >= 2) ? `${dash.get(0)} ${dash.get(1)}` : 'none'
		const dynamic = isExpr(layer.getIn(['paint', 'line-color']))

		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<path
						d="M15,62 C70,12 150,12 205,62"
						fill="none"
						stroke={color}
						strokeWidth={width}
						strokeOpacity={opacity}
						strokeLinecap={cap}
						strokeDasharray={dashStyle === 'none' ? undefined : dashStyle}
					/>
				</svg>
				{this.renderDynamic(dynamic)}
			</div>
		)
	}

	// circle
	renderCircle (){
		const {layer} = this.props
		const color = colorOf(layer, 'circle-color', F['#'])
		const radius = Math.max(2, numOf(layer, 'circle-radius', 8))
		const opacity = numOf(layer, 'circle-opacity', 1)
		const stroke = colorOf(layer, 'circle-stroke-color', '#FFFFFF')
		const strokeW = numOf(layer, 'circle-stroke-width', 1)
		const strokeOpacity = numOf(layer, 'circle-stroke-opacity', 1)
		const dynamic = isExpr(layer.getIn(['paint', 'circle-color']))

		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<circle
						cx="110"
						cy="45"
						r={radius}
						fill={color}
						fillOpacity={opacity}
						stroke={stroke}
						strokeOpacity={strokeOpacity}
						strokeWidth={strokeW}
					/>
				</svg>
				{this.renderDynamic(dynamic)}
			</div>
		)
	}

	// symbol (text)
	renderSymbol (){
		const {layer} = this.props
		const color = colorOf(layer, 'text-color', '#273237')
		const halo = colorOf(layer, 'text-halo-color', '#FFFFFF')
		const haloW = numOf(layer, 'text-halo-width', 1)
		const size = Math.max(8, numOf(layer, 'text-size', 14))
		const dynamic = isExpr(layer.getIn(['paint', 'text-color']))

		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<text
						x="110"
						y="52"
						textAnchor="middle"
						fontSize={size}
						fontFamily="'Open Sans', sans-serif"
						fill={color}
						stroke={halo}
						strokeWidth={haloW}
						paintOrder="stroke"
					>Moscow</text>
				</svg>
				{this.renderDynamic(dynamic)}
			</div>
		)
	}

	// heatmap (always a color ramp)
	renderHeatmap (){
		const {layer} = this.props
		const stops = getStops(layer.getIn(['paint', 'heatmap-color']))
		const bg = stops && stops.length >= 2 ? rampGradient(stops) : `linear-gradient(to right, ${F['#']}, #FF5252)`
		const intensity = numOf(layer, 'heatmap-intensity', 1)
		const radius = Math.max(20, numOf(layer, 'heatmap-radius', 40) * 1.4)

		const id = 'hp-' + (layer.get('id') || 'hm')
		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<defs>
						<radialGradient id={id}>
							<stop offset="0%" stopColor="#FF5252" stopOpacity={0.9 * intensity}/>
							<stop offset="35%" stopColor="#FF9800" stopOpacity={0.7 * intensity}/>
							<stop offset="70%" stopColor="#00ACC1" stopOpacity={0.4 * intensity}/>
							<stop offset="100%" stopColor="#00ACC1" stopOpacity={0}/>
						</radialGradient>
					</defs>
					<circle cx="110" cy="45" r={radius} fill={`url(#${id})`}/>
					<rect x="0" y="80" width="220" height="10" fill={bg}/>
				</svg>
			</div>
		)
	}

	// hillshade / raster-dem
	renderHillshade (){
		const {layer} = this.props
		const exag = numOf(layer, 'hillshade-exaggeration', 0.5)
		const shade = numOf(layer, 'hillshade-shadow-color', '#333333')
		const highlight = colorOf(layer, 'hillshade-highlight-color', '#FFFFFF')
		const opacity = numOf(layer, 'hillshade-opacity', 1)

		const id = 'hs-' + (layer.get('id') || 'hill')
		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<defs>
						<linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stopColor={highlight}/>
							<stop offset="50%" stopColor="#9E9E9E"/>
							<stop offset="100%" stopColor={shade}/>
						</linearGradient>
					</defs>
					<path d="M10,80 Q60,30 110,55 T210,35 L210,80 Z" fill={`url(#${id})`} opacity={opacity}
						style={{filter: `brightness(${1 + exag * 0.15}) contrast(${1 + exag * 0.25})`}}/>
				</svg>
			</div>
		)
	}

	// raster / raster-dem
	renderRaster (){
		const {layer} = this.props
		const opacity = numOf(layer, 'raster-opacity', 1)
		const id = 'rs-' + (layer.get('id') || 'r')
		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<defs>
						<linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stopColor="#8BC34A"/>
							<stop offset="45%" stopColor="#FFEB3B"/>
							<stop offset="100%" stopColor="#B71C1C"/>
						</linearGradient>
					</defs>
					<rect x="10" y="12" width="200" height="66" rx="4" fill={`url(#${id})`} opacity={opacity}/>
				</svg>
			</div>
		)
	}

	// fill-extrusion
	renderFillExtrusion (){
		const {layer} = this.props
		const color = colorOf(layer, 'fill-extrusion-color', F['#'])
		const opacity = numOf(layer, 'fill-extrusion-opacity', 0.7)
		const height = Math.max(20, numOf(layer, 'fill-extrusion-height', 40))
		const base = 78
		const top = base - height

		return (
			<div className="layer-preview-sample-wrap">
				<svg className="layer-preview-sample" viewBox="0 0 220 90" preserveAspectRatio="xMidYMid meet">
					<polygon points={`70,${base} 120,${base} 140,${base - 16} 90,${base - 16}`} fill={color} fillOpacity={opacity * 0.7}/>
					<polygon points={`70,${base} 120,${base} 120,${top} 70,${top}`} fill={color} fillOpacity={opacity}/>
					<polygon points={`70,${top} 120,${top} 140,${top - 16} 90,${top - 16}`} fill={color} fillOpacity={Math.min(1, opacity + 0.15)}/>
				</svg>
			</div>
		)
	}

	render (){
		const {layer} = this.props

		if (!layer || !layer.get) return <div/>

		const type = layer.get('type')

		switch (type){
			case 'background':
				return this.renderFrame('background', this.renderBackground())
			case 'fill':
			case 'fill-outline':
				return this.renderFrame('fill', this.renderFill())
			case 'line':
				return this.renderFrame('line', this.renderLine())
			case 'circle':
				return this.renderFrame('circle', this.renderCircle())
			case 'symbol':
				return this.renderFrame('symbol', this.renderSymbol())
			case 'heatmap':
				return this.renderFrame('heatmap', this.renderHeatmap())
			case 'hillshade':
			case 'raster-dem':
				return this.renderFrame('hillshade', this.renderHillshade())
			case 'raster':
				return this.renderFrame('raster', this.renderRaster())
			case 'fill-extrusion':
				return this.renderFrame('fill-extrusion', this.renderFillExtrusion())
			default:
				return this.renderFrame(type || 'layer', this.renderFill())
		}
	}

	renderFrame (label, sample){
		return (
			<div className="layer-preview">
				<div className="layer-preview-head">
					<span className="layer-preview-title">preview</span>
					<span className="layer-preview-type">{label}</span>
				</div>
				{sample}
				{this.renderRamps()}
			</div>
		)
	}
}

LayerEditPreview.propTypes = {
	layer: PropTypes.object.isRequired,
}

export default LayerEditPreview
