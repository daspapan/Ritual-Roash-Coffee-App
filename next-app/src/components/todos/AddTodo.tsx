"use client"

import React, { useState } from 'react'
import Form from '../form/Form'
import Input from '../input/Input'
import DefaultButton from '../button/DefaultButton'
import { createTodo } from '@/actions';
import TextArea from '../input/TextArea'


interface AddTodoProps {
    name?:string
}

const AddTodo = ({}:AddTodoProps) => {

    const [isLoading, setIsLoading] = useState<Boolean>(false);

    return (
        <div className="flex justify-center items-center bg-gray-100 p-4 sm:p-6 md:p-8">
            <Form action={createTodo} classname="bg-white p-6 rounded-lg shadow-md w-full max-w-md">

                <h2 className="text-2xl font-bold mb-6 text-center">Add Todo's</h2>

                <div className="mb-4">
                    <Input required name='title' type='text' placeholder='Add title here.'/>
                </div>

                <div className="mb-4">
                    <TextArea name='description' placeholder='Add description here.'/>
                </div>

                <div className='mb-4 flex gap-2'>
                    <Input name='start_date' label='Start Date' type='date' />
                    <Input name='due_date' label='End Date' type='date' />
                </div>

                <div className="mb-4">
                    <TextArea name='remark' placeholder='Add remark here.'/>
                </div>

                <div>
                    <DefaultButton type='submit' text="Add" bgColor='bg-blue-600' className='w-full'/>
                </div>
            </Form>
        </div>
    )
}

export default AddTodo