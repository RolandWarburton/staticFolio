import React, { useState } from "react";

import { useField } from "formik";
import { FormControlLabel } from "@material-ui/core";

import { BlueCheckbox } from "./MUIStyles";

const MyCheckbox = ({ children, ...props }) => {
	// React treats radios and checkbox inputs differently other input types, select, and textarea.
	// Formik does this too! When you specify `type` to useField(), it will
	// return the correct bag of props for you
	const [field, meta] = useField({ ...props, type: "checkbox" });
	// console.log(field);

	// console.log(`if ${field.value} includes ${props.value}`);

	// const [isChecked, setIsChecked] = useState(props.checked || false);

	return (
		<div>
			{/* <label className="checkbox">
				<input type="checkbox" {...field} {...props} />
				{children}
			</label> */}

			<FormControlLabel
				control={
					<BlueCheckbox
						// ? formik controls
						{...field}
						{...props}
						// checked={field.value === props.value}
						// onClick={() => {
						// 	setIsChecked(!isChecked);
						// }}
					/>
				}
				label="Hidden"
			/>

			{meta.touched && meta.error ? (
				<div className="error">{meta.error}</div>
			) : null}
		</div>
	);
};

export default MyCheckbox;
