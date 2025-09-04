"use client";

import React, { useEffect, useState } from 'react'
import { getPreSignedUrl, TodoInput } from '@/actions'
import Link from 'next/link'
import { Download, FileText, Image as ImageIcon } from 'lucide-react';

type ViewAttachmentProps = {
    todo: TodoInput
}

const ViewAttachment = ({todo}:ViewAttachmentProps) => {

    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [fileSrc, setFileSrc] = useState<string>();
    const [error, setError] = useState(null);

    useEffect(() => {

        console.log("[Using Effect]")

        const checkFileSrc = async () => {

            console.log("[Check file src]")

            const path = todo.attachment || undefined

            console.log("[file path]", path)
            console.log("file storage", todo.storage)
            console.log("file type", todo.content_type)
            console.log(todo)

            try {
                if(todo.storage?.toLowerCase() === "local"){
                    console.log("path",path)
                    setFileSrc(path)
                }else{
                    // const response = await new Promise(resolve => setTimeout(() => resolve('Fetched data!'), 2000));
                    const s3Path = await getPreSignedUrl(path || "")
                    console.log("s3Path", s3Path)
                    setFileSrc(s3Path)
                }
                
            } catch (error:any) {
                setError(error);
            } finally {
                setIsLoading(true)
            }

        }

        checkFileSrc()

    }, [])


    if (!isLoading) {
        return <div>Loading attachment...</div>;
    }

    if (error) {
        return <div>Error: {JSON.stringify(error, null, 2)}</div>;
    }

    

    return (
        <div className="flex flex-col items-center p-4 border rounded-lg shadow-sm w-full max-w-sm mx-auto bg-white dark:bg-gray-800">
            {/* Conditional Display Area */}
            {isLoading && (<div className="w-full flex justify-center items-center h-48 mb-4 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                {todo.content_type?.includes('image') ? (
                    <img src={fileSrc} alt={todo.title} className="object-contain max-h-full max-w-full" />
                ) : todo.content_type?.includes('pdf') ? (
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <FileText size={48} />
                        <span className="mt-2 text-center break-words px-2">{todo.attachment?.split('/').pop()}</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <FileText size={48} />
                        <span className="mt-2">Unsupported File Type</span>
                    </div>
                )}
            </div>)}

            {/* File Info */}
            <div className="w-full text-center mb-4">
                <p className="font-semibold text-gray-800 dark:text-gray-100 break-words">{todo.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {todo.content_type?.includes('image') ? 'Image' : todo.content_type?.includes('pdf') ? 'PDF Document' : 'File'}
                </p>
            </div>

            {/* Download Button */}
            <Link
                href={fileSrc || ''}
                download
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors w-full"
            >
                <Download size={16} className="mr-2" />
                Download
            </Link>


            {process.env.DEBUG && <div className='flex'>
                {`[Attachment] ${todo.attachment}`}
            </div>}
        </div>
    )
}

export default ViewAttachment