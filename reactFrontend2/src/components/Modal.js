import React, { useState } from "react";
import HistoryDropdown from "./dropdowns/HistoryDropdown";
import SourcesDropdown from "./dropdowns/SourcesDropdown";
import { Button } from "@material-ui/core";
import "../styles/styles.scss";

import PageEditField from "./pageEditField/PageEditField";

const formCallback = async (fieldState, avoid, push) => {
	const { _id, fieldName, newValue } = fieldState;
	// UPDATE WHERE SELECT _id IS _id
	const filter = { _id: _id };

	// SET source.url = newValue
	const update = { [fieldName]: push };

	// print them out for debugging
	console.log(`filter: ${JSON.stringify(filter)}`);
	console.log(`update: ${JSON.stringify(update)}`);

	// construct the body request
	const body = {
		filter: filter,
		update: update,
	};

	// stringify it for the POST request
	console.log("stringifying the body");
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

const deletePageHandler = async (_id) => {
	const postURL = `https://watch.rolandw.dev/delete/${_id}`;
	const options = {
		method: "POST",
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		},
	};
	const result = await (await fetch(postURL, options)).json();
	return result;
};

export default function Model(props) {
	// console.log(props);
	const [open, setOpen] = useState(false);
	const [fields, setFields] = useState([]);

	const { _id } = props.data.original;

	// uses the setOpen() state to control the modal
	function toggleModal(e) {
		e.preventDefault();

		// set open to the opposite
		setOpen(!open);

		// if the modal is opening load in the fields for it
		if (!open) {
			console.log(`loading fields for the modal: "${props.pageName}"`);
			setFields(
				formFieldComponents.map((field) => {
					return field;
				})
			);
		}
	}

	// a tempalte that defines each field in the edit
	const formFields = [
		{
			name: "ID",
			fieldName: "_id",
			value: props._id,
			disabled: true,
		},
		{
			name: "Page Name",
			fieldName: "pageName",
			value: props.pageName,
			disabled: false,
		},
		{
			name: "Website Path",
			fieldName: "websitePath",
			value: props.websitePath,
			disabled: false,
		},
		{
			name: "Hidden",
			fieldName: "hidden",
			value: props.hidden,
			disabled: false,
		},
		{
			name: "Revision",
			fieldName: "__v",
			value: props.__v,
			history: props.history,
			disabled: true,
		},
	];

	const formFieldComponents = formFields.map((field, i) => {
		return (
			<PageEditField
				name={field.name}
				fieldName={field.fieldName}
				value={field.value}
				key={props._id + i}
				_id={props._id}
				disabled={field.disabled}
				deletable={false}
				color={"#282C34"}
				formCallback={formCallback}
			/>
		);
	});

	return (
		<>
			<button
				className="button is-dark"
				key={props.cellID}
				onClick={toggleModal}
			>
				Edit
			</button>

			{/* Modal wrapper */}
			<div className={`modal ${open ? "is-active" : ""} `}>
				{/* Dim background */}
				<div className="modal-background" onClick={toggleModal}></div>

				{/* Modal card */}
				<div className="modal-card">
					<header className="modal-card-head">
						<p className="modal-card-title">{props.pageName}</p>
						<button
							className="delete"
							aria-label="close"
							onClick={toggleModal}
						></button>
					</header>
					<section className="modal-card-body">
						{/* print out every form field for this modal */}
						<div className="fieldsGoHere">
							{fields.map((f) => {
								return f;
							})}
						</div>
						<HistoryDropdown
							_id={props.data.original._id}
							source={props.data.original.source}
						></HistoryDropdown>
						<SourcesDropdown
							_id={props.data.original._id}
							source={props.data.original.source}
							addField={true}
							name={"sources"}
						></SourcesDropdown>
					</section>
					<footer className="modal-card-foot">
						<Button
							variant="contained"
							type="submit"
							color="primary"
							disabled={false}
							onClick={async () => {
								// delete the page
								await deletePageHandler(_id);

								// close the modal after deleting the page
								toggleModal();

								// TODO somehow let Pages/Table component know of the change to reload fetchData or remote the row somehow
								// remove the row from the table
							}}
						>
							Delete
						</Button>
					</footer>
				</div>
				{/* End modal card */}
			</div>
			{/* End modal wrapper */}
		</>
	);
}
