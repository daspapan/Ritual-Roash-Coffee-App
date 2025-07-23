"use client"

import { useRef } from 'react';
import React, { ReactNode } from 'react'

interface FormProps {
    children:ReactNode;
    action: (formData: FormData) => void;
    classname?: string;
    onSubmit?: () => void;
}

const Form = ({children, action, className, onSubmit}:FormProps) => {
    const ref = useRef<HTMLFormElement>(null);
    return (
        <form action={
            async (FormData) => {
                await action(FormData);
                ref.current?.reset()
            }
        } onSubmit={onSubmit} ref={ref}>
            {children}
        </form>
    )
}

export default Form