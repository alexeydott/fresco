import {Map} from 'immutable'

const state = {
	serverUrl: null,
	maps: Map({}),
	currentMap: null,
	loading: false,
	error: null,
}

export const reducer = (st = state, action)=>{
	switch (action.type){
		case 'TEGLA_CAPABILITIES':{
			const {serverUrl, maps} = action.payload
			return {
				...st,
				serverUrl,
				maps,
				currentMap: null,
				loading: false,
				error: null,
			}
		}
		case 'TEGLA_MAP_SELECT':{
			const {map} = action.payload
			return {
				...st,
				currentMap: map,
				loading: false,
				error: null,
			}
		}
		case 'TEGLA_ERROR':{
			const {error} = action.payload
			return {
				...st,
				loading: false,
				error,
			}
		}
		case 'TEGLA_LOADING':{
			const {loading} = action.payload
			return {
				...st,
				loading,
			}
		}
		default:
			return st
	}
}
