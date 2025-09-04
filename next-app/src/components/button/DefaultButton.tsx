import clsx from 'clsx';
import { Icon } from 'next/dist/lib/metadata/types/metadata-types';
import React, { ReactNode } from 'react'

interface DefaultButtonProps {
    type?: 'button' | 'submit' | 'reset';
    text: string | ReactNode;
    className?: string;
    onClick?: () => void;
    actionButton?:boolean;
    bgColor?:string;
    textColor?:string;
    icon?: Icon;
}

const DefaultButton = ({icon, type, text, onClick, actionButton, bgColor, ...props}: DefaultButtonProps) => {
    return (
        <div className='py-2 px-2'>
            <button onClick={onClick} type={type} className={clsx(
                actionButton && 'text-white hover:bg-blue-800 focus:ring-4 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 focus:outline-none',
                `w-full text-white ${bgColor} hover:${bgColor} font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 focus:outline-none`
            )}>

                {icon && "Hello Icon"}

                {text}

            </button>
        </div>
    )
}

export default DefaultButton