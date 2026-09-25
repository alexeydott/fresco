import Store from '../../Store'
import {fromJS} from 'immutable'

import actions from '../actions'
import helpers from './helpers'
import utilRequest from '../../utility/utilRequest'

const loadingSet = async ({loading})=>{
	Store.dispatch({
		type:'TEGLA_LOADING',
		payload:{loading},
	})
}

const errorSet = async ({error})=>{
	Store.dispatch({
		type:'TEGLA_ERROR',
		payload:{error: error? error: null},
	})
}

// fetch {serverUrl}/capabilities -> list of maps
const connect = async ({serverUrl})=>{
	if (!serverUrl || serverUrl.length < 1) throw new Error('tegola.connect: no server url defined')

	const url = helpers.normalizeServerUrl(serverUrl)

	await loadingSet({loading: true})
	try {
		const data = await utilRequest.get({url: helpers.getCapabilitiesUrl(url)})
		const dataImm = fromJS(data)
		Store.dispatch({
			type:'TEGLA_CAPABILITIES',
			payload:{
				serverUrl: url,
				maps: dataImm.get('maps'),
			},
		})
	} catch(e){
		console.error(e)
		await errorSet({error: e.message})
	}

	return url
}

// fetch {serverUrl}/capabilities/{name}.json -> tilejson for the map
const selectMap = async ({name})=>{
	if (!name || name.length < 1) throw new Error('tegola.selectMap: no map name defined')

	const state = Store.getState()
	const serverUrl = state.tegola.serverUrl
	if (!serverUrl) throw new Error('tegola.selectMap: not connected to server')

	await loadingSet({loading: true})
	try {
		const data = await utilRequest.get({url: helpers.getSourceUrl(serverUrl, name)})
		let dataImm = fromJS(data)
		if (!dataImm.has('name')) dataImm = dataImm.set('name', name)
		Store.dispatch({
			type:'TEGLA_MAP_SELECT',
			payload:{map: dataImm},
		})
	} catch(e){
		console.error(e)
		await errorSet({error: e.message})
	}

	return name
}

// build a mapbox style from the selected map and open it in the editor
const createStyle = async ()=>{
	const state = Store.getState()
	const serverUrl = state.tegola.serverUrl,
		currentMap = state.tegola.currentMap

	if (!currentMap) throw new Error('tegola.createStyle: no map selected')
	if (!serverUrl) throw new Error('tegola.createStyle: not connected to server')

	const mapName = currentMap.get('name')
	const sourceId = helpers.getSourceId(mapName)
	const sourceUrl = helpers.getSourceUrl(serverUrl, mapName)

	await loadingSet({loading: true})
	try {
		// reuse the existing source ingest to pull tilejson + auto-generate layers
		const sourceData = await actions.act('source.pullData', {url: sourceUrl})
		const layers = await actions.act('source.makeLayersFromData', {sourceId, sourceData})

		let styleJson = {
			version: 8,
			name: sourceId,
			sources: {
				[sourceId]: {
					type: 'vector',
					url: sourceUrl,
				},
			},
			layers: [
				{
					id: 'background',
					type: 'background',
					layout: {
						visibility: 'visible',
					},
					paint: {
						'background-color': '#37474F',
					},
				},
			].concat(layers),
		}

		const center = helpers.getCenter(currentMap)
		if (center){
			styleJson.center = center.center
			styleJson.zoom = center.zoom
		}

		const jsonImm = fromJS(styleJson)
		const styleImm = await actions.act('style.addFromJson', {json: jsonImm})

		await loadingSet({loading: false})

		return styleImm.get('id')
	} catch(e){
		console.error(e)
		await errorSet({error: e.message})
		await loadingSet({loading: false})
		return null
	}
}

actions.subscribe('tegola',{
	connect,
	createStyle,
	errorSet,
	selectMap,
})

export default {
	connect,
	createStyle,
	errorSet,
	selectMap,
}
