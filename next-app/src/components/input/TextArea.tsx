import React, { ChangeEvent } from 'react'

interface TextAreaProps extends React.InputHTMLAttributes<HTMLInputElement> {
    name:string;
    label?: string;
    placeholder?:string;
    value?:string;
    defaultValue?:string;
    onChange?:(event: ChangeEvent<HTMLInputElement>) => void;
    rows?:string;
}

const TextArea = ({name, label, type, placeholder, value, defaultValue, onChange, ...props}:TextAreaProps) => {
    return (
        <div className='flex flex-col gap-1'>
            {label && <label className='block text-gray-700 text-sm font-bold mb-2'>{label}</label>}
            {/* <input name={name} type={type} placeholder={placeholder} value={value} defaultValue={defaultValue} onChange={onChange}
                className=''
                {...props}
            /> */}

            <textarea
                name={name}
                value={value}
                defaultValue={defaultValue}
                onChange={(e) => onChange}
                className="block w-full p-4 border rounded-lg text-base bg-gray-700 border-gray-600 placeholder-gray-400 text-white"
                placeholder={placeholder}
                rows={3}
            />
        </div>
    )
}

export default TextArea