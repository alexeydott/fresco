export default {
	getServerUrl: (state)=>{
		return state.tegola.serverUrl
	},
	getMaps: (state)=>{
		return state.tegola.maps
	},
	getCurrentMap: (state)=>{
		return state.tegola.currentMap
	},
	getLoading: (state)=>{
		return state.tegola.loading
	},
	getError: (state)=>{
		return state.tegola.error
	},
}
