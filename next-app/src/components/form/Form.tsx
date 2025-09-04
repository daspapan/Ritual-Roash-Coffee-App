"use client"

import clsx from 'clsx';
import { useRef } from 'react';
import React, { ReactNode } from 'react'

interface FormProps {
    children:ReactNode;
    action: (formData: FormData) => void;
    classname?: string;
    onSubmit?: () => void;
}

const Form = ({children, action, classname, onSubmit}:FormProps) => {
    const ref = useRef<HTMLFormElement>(null);
    return (
        <form action={
            async (FormData) => {
                await action(FormData);
                ref.current?.reset()
            }
        } onSubmit={onSubmit} className={clsx(classname)} ref={ref}>
            {children}
        </form>
    )
}

export default Form