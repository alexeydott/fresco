import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import {withRouter} from 'react-router-dom'

import modelTegola from '../../model/tegola'

import Field from '../Field'
import Icon from '../Icon'

class Tegola extends React.Component {

	constructor(props){
		super(props)

		const {serverUrl} = this.props

		this.state = {
			serverUrl: serverUrl || modelTegola.constants.defaultServerUrl,
		}
	}

	handleServerUrlChange = ({value})=>{
		this.setState({serverUrl: value})
	}

	handleConnect = async ()=>{
		const {serverUrl} = this.state
		try {
			await modelTegola.actions.connect({serverUrl})
		} catch(e){
			modelTegola.actions.errorSet({error: e.message})
		}
	}

	handleMapSelect = async ({name})=>{
		try {
			await modelTegola.actions.selectMap({name})
		} catch(e){
			modelTegola.actions.errorSet({error: e.message})
		}
	}

	handleCreateStyle = async ()=>{
		const {history} = this.props
		try {
			const styleId = await modelTegola.actions.createStyle()
			if (styleId && history) history.push(`/style/${styleId}`)
		} catch(e){
			modelTegola.actions.errorSet({error: e.message})
		}
	}

	render (){
		const {currentMap, error, loading, maps} = this.props

		return (
			<div className="content-body content-body-full">
				<h2 className="content-title">
					<span className="content-title-label">Tegola</span>
				</h2>

				{this.renderServerInput()}
				{error && this.renderError()}
				{loading && this.renderLoading()}

				{maps && !loading && !error && this.renderMaps()}
				{currentMap && !loading && !error && this.renderMapDetail()}
			</div>
		)
	}

	renderServerInput (){
		const {serverUrl} = this.state

		const handle = {
			change: this.handleServerUrlChange,
		}

		return (
			<div className="property-content">
				<div className="property">
					<Field
						name={'tegola-server-url'}
						placeholder={'http://host:port'}
						inputClass={'form-control form-control-sm'}
						inputNoAC={true}
						handle={handle}
						type={'string'}
						value={serverUrl}
					/>
				</div>
				<div className="property">
					<button className="btn btn-primary" onClick={this.handleConnect}>
						<Icon icon={'source'}/> Connect
					</button>
				</div>
			</div>
		)
	}

	renderError (){
		const {error} = this.props

		return (
			<div className="alert alert-danger">
				<span className="alert-message">{error}</span>
			</div>
		)
	}

	renderLoading (){
		return (
			<div className="property-content">
				<div className="spinner-border text-info" role="status">
					<span className="sr-only">Loading...</span>
				</div>
			</div>
		)
	}

	renderMaps (){
		const {maps} = this.props

		return (
			<div className="content-body">
				<h3 className="content-body-title">Maps</h3>
				{maps.map((m)=>{
					const name = m.get('name')
					return (
						<div key={name} className="content-body-row interactive" onClick={()=>this.handleMapSelect({name})}>
							<div className="row-icon-left">
								<Icon icon={'styles'}/>
							</div>
							{name}
						</div>
					)
				})}
			</div>
		)
	}

	renderMapDetail (){
		const {currentMap} = this.props

		const vectorLayers = currentMap.get('vector_layers')
		const attribution = currentMap.get('attribution')
		const center = currentMap.get('center')

		return (
			<div className="content-body">
				<h3 className="content-body-title">Layers</h3>
				{vectorLayers && vectorLayers.map((l, i)=>{
					const name = l.get('name') || l.get('id')
					const type = l.get('geometry_type')
					const minzoom = l.get('minzoom')
					const maxzoom = l.get('maxzoom')
					return (
						<div key={i} className="content-body-row">
							<span>{name}</span>
							<span className="badge badge-secondary">{type}</span>
							<span>z{minzoom}-{maxzoom}</span>
						</div>
					)
				})}
				{attribution && <div className="content-body-row alert">{attribution}</div>}
				{center && <div className="content-body-row">center: {center.get(0)}, {center.get(1)} (z{center.get(2)})</div>}

				<div className="property-content">
					<button className="btn btn-primary" onClick={this.handleCreateStyle}>
						<Icon icon={'style'}/> Open in Style Editor
					</button>
				</div>
			</div>
		)
	}
}

Tegola.propTypes = {
	currentMap: PropTypes.object,
	error: PropTypes.string,
	history: PropTypes.object,
	loading: PropTypes.bool,
	maps: PropTypes.object,
	serverUrl: PropTypes.string,
}

const mapStateToProps = (state, props)=>{
	return {
		currentMap: modelTegola.selectors.getCurrentMap(state),
		error: modelTegola.selectors.getError(state),
		loading: modelTegola.selectors.getLoading(state),
		maps: modelTegola.selectors.getMaps(state),
		serverUrl: modelTegola.selectors.getServerUrl(state),
	}
}

export default connect(
	mapStateToProps,{}
)(withRouter(Tegola))
