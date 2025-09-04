'use client';

import React, { ChangeEvent, useState } from 'react'
import DefaultButton from '../button/DefaultButton'
import Form from '../form/Form'
import Input from '../input/Input'
import { TodoInput, uploadAttachment, uploadFile } from '@/actions'
import { Upload, UploadIcon } from 'lucide-react';

type UploadAttachmentProps = {
    todo: TodoInput
}

const UploadAttachment = ({todo}:UploadAttachmentProps) => {

    /* const [productId, setProductId] = useState<string>("123")
    const [filename, setFilename] = useState<string>("")
    const [contentType, setContentType] = useState<string>("")

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            //console.log("[files]", files[0])

            setFilename(files[0].name)
            setContentType(files[0].type)

        } else {
            console.log("[No files selected.]")
            setFilename("")
        }
    }; */

    return (
        <div className="flex flex-col items-center p-4 border rounded-lg shadow-sm w-full max-w-sm mx-auto bg-white dark:bg-gray-800">
            {/* <Form action={uploadFile}>
                <Input name='productId' type='text' placeholder='Add Product Id Here... ' defaultValue={productId} />
                <Input name='contentType' type='text' placeholder='Add Product Id Here... ' defaultValue={contentType} />
                <Input name='fileName' type='text' placeholder='Add File Name Here... ' defaultValue={filename}/>
                <Input name='select_file' type='file' onChange={handleFileChange}/>
                <DefaultButton type='submit' text="Upload" bgColor='bg-blue-600'/>
            </Form> */}

            <Form action={uploadAttachment}>
                
                <Input name='todoId' type='hidden' placeholder='Add Product Id Here... ' defaultValue={todo.id} />
                
                <div className="flex gap-2">
                    <div className="w-2/3">
                        <Input name='select_file' type='file' className='inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors w-full' />
                    </div>
                    <div className="w-1/3">
                    
                        <button
                            // className="flex w-full h-full items-center justify-center px-2 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                            className='inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors w-full'
                        >
                            <Upload size={16} className="mr-2" />

                            Upload 
                        </button>
                    </div>
                </div>
            </Form>
        </div>
    )
}

export default UploadAttachment