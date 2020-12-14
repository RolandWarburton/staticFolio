import React, { useState } from "react";
import PageEditField from "../pageEditField/PageEditField";
import "../../styles/styles.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faAngleDown,
	faAngleUp,
	faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Collapsible } from "./styles";

function DropdownButton(props) {
	const { collapsed } = props;
	return (
		<FontAwesomeIcon
			onClick={(e) => {
				e.preventDefault();
			}}
			className="has-text-right icon"
			icon={collapsed ? faAngleUp : faAngleDown}
			color={"white"}
		/>
	);
}

function PlusButton(props) {
	return (
		<FontAwesomeIcon
			onClick={(e) => {
				console.log("add button clicked");
				e.preventDefault();
				props.onClick();
			}}
			className="has-text-right icon"
			icon={faPlusCircle}
			color={"white"}
		/>
	);
}

/**
 *
 * @param {*} fieldState - {_id, newValue, fieldName, value, firstValue}
 * @param {*} avoid - the element to avoid
 * @param {*} push - the element to substitute
 */
const formCallback = async (fieldState, avoid, push) => {
	// extract the _id from the fieldState goody bag
	const { _id } = fieldState;

	// UPDATE WHERE SELECT _id IS _id
	const filter = { _id: _id };

	// ##──────────────────────────────────────────────────────────────────────────────────────
	// The goal of this code is to
	// 1. get the og page.source from the database
	// 2. remove the og value from it and keep everything else
	// 3. replace the og value with our new one
	// 4. submit that new array back as our updated sources list
	const doc = await (
		await fetch(`https://api.blog.rolandw.dev/api/v1/watch/page?_id=${_id}`)
	).json();

	console.log(
		`the sources received from the database: ${JSON.stringify(
			doc.source,
			null,
			2
		)}`
	);

	const sourceArray = doc.source;
	console.log(`avoiding ${avoid} from the database sources`);

	// get everything that isnt the first value from the og sources list
	const newSourceList = sourceArray
		.filter((source) => source.url !== avoid)
		.map((source) => source);

	// now push our new source to the array that doesnt contain the one we are changing
	console.log(`add ${push} to: ${newSourceList}`);
	newSourceList.push({ remote: true, url: push });

	// fully overwrite the source list with our new one
	const update = { source: newSourceList };

	// construct the body request
	const body = {
		filter,
		update,
	};

	// print them out for debugging
	// console.log(`filter: ${JSON.stringify(filter, null, 2)}`);
	console.log(`update: ${JSON.stringify(update, null, 2)}`);

	// stringify it for the POST request
	const bodyString = JSON.stringify(body);

	// send the post request
	const url = `https://api.blog.rolandw.dev/api/v1/watch/update/${_id}`;
	return fetch(url, {
		method: "POST",
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		},
		body: bodyString,
	});
};

const deleteCallback = async (_id, newValue, fieldName, value, firstValue) => {
	// UPDATE WHERE SELECT _id IS _id
	const filter = { _id: _id };

	// ##──────────────────────────────────────────────────────────────────────────────────────
	// The goal of this code is to
	// 1. get the og page.source from the database
	// 2. remove the og value from it and keep everything else
	// 4. submit that new array back as our updated sources list
	const doc = await (
		await fetch(`https://api.blog.rolandw.dev/api/v1/watch/page?_id=${_id}`)
	).json();

	const sourceArray = doc.source;

	// get everything that isnt the first value from the og sources list
	const newSourceList = sourceArray
		.filter((source) => source.url !== firstValue)
		.map((source) => source);

	// fully overwrite the source list with our new one
	const update = { source: newSourceList };

	// construct the body request
	const body = {
		filter,
		update,
	};

	// stringify it for the POST request
	console.log("stringifying the body");
	const bodyString = JSON.stringify(body);

	// print them out for debugging
	// console.log(`filter: ${JSON.stringify(filter)}`);
	// console.log(`update: ${JSON.stringify(update)}`);

	// send the post request
	const url = `https://api.blog.rolandw.dev/api/v1/watch/update/${_id}`;
	return fetch(url, {
		method: "POST",
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		},
		body: bodyString,
	});
};

const renderData = (url, _id, index, initialMode) => {
	return (
		<PageEditField
			noTitle
			name={"URL"}
			value={url}
			fieldName={"source.url"}
			disabled={false}
			deletable={true}
			initialMode={initialMode || "display"}
			_id={_id}
			color={"#363636"}
			key={_id + "/" + url + index}
			// formCallback takes: {fieldState: {_id, newValue, fieldName, value, firstValue}, avoid, push}
			formCallback={formCallback}
			deleteCallback={(_id, newValue, fieldName, value, firstValue) => {
				const props = [_id, newValue, fieldName, value, firstValue];
				return deleteCallback(...props);
			}}
			onChange={(newValue) => {
				// this is a callback that runs every time a letter is typed into the field
				// console.log(newValue);
			}}
		/>
	);
};

/**
 *
 * @param {String} props._id - ID for the document that this dropdown refers to
 * @param {Boolean} props.addField - set to true to enable add-field button
 * @param {String} props.name - Name of this dropdown
 * @param {Array} props.source - sources array of json. EG. [{url: string, remote: bool}]
 */
export default function SourcesDropdown(props) {
	// ##──── State ─────────────────────────────────────────────────────────────────────────────
	// toggle to control if the dropdown is displayed
	const [collapsed, setCollapsed] = useState(false);

	// the text of the dropdown button
	const [buttonText, setButtonText] = useState(`Open ${props.name}`);

	// controls when data is being loaded in to pause rendering
	const [loading, setLoading] = useState(true);

	// an array of JSON that describes the data of each field
	// Example data: [{url: string, initialMode: string(optional)}]
	const [fields, setFields] = useState([]);
	// ##──── End state ─────────────────────────────────────────────────────────────────────────

	// ##──── Prop params ───────────────────────────────────────────────────────────────────────
	const { _id } = props;
	const { source } = props;

	/**
	 * When the collapser button is pressed this is called
	 * - loadData uses the props.source given to this component to set the fields state
	 * - loadData only sets the fields state if its not collapsed (ie visible)
	 * - this function should only be called once
	 *
	 */
	const loadData = () => {
		if (!collapsed) {
			const data =
				source instanceof Array && source !== undefined
					? source
					: new Array(source);

			// set the fields state to render these in
			setFields(data);

			// set loading to false because setFields now has data
			setLoading(false);
		}
	};

	/**
	 * handles if the dropdown should be displayed or not
	 * @param {JSON} event - the click event from the associated button
	 */
	const handleCollapser = (event) => {
		event.preventDefault();
		setCollapsed(!collapsed);

		// get the target conent div to show/hide it
		const content = event.target.closest("div").querySelector(".content");

		if (collapsed) {
			content.className = "content collapsed";
			setButtonText(`Open ${props.name}`);
		} else {
			content.className = "content";
			setButtonText(`Close ${props.name}`);
			loadData();
		}
	};

	/**
	 * handles adding a field by adding a new object to the fields state for rendering
	 */
	const handleAddField = () => {
		console.log("adding field");
		setFields(fields.concat({ url: "", initialMode: "edit" }));
	};

	return (
		<Collapsible>
			<a href={"/"} onClick={handleCollapser}>
				{buttonText} <DropdownButton collapsed={collapsed} />
			</a>

			<div className="content collapsed">
				{!loading &&
					// render each field in the dropdown using the fields state
					fields.map((field, index) => {
						return renderData(
							field.url,
							_id,
							index,
							field.initialMode
						);
					})}

				{/* if loading has finished and theres no fields to render "No Data"*/}
				{!loading && fields.length === 0 && `No data found.`}

				{/* render the add field button if enabled through props */}
				{props.addField && <PlusButton onClick={handleAddField} />}
			</div>
		</Collapsible>
	);
}
