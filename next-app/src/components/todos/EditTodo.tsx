'use client'

import React, { useState } from 'react'
import DefaultButton from '../button/DefaultButton';
import { MdEdit } from 'react-icons/md';
import Input from '../input/Input';
import Form from '../form/Form';
import * as actions from '@/actions'

const EditTodo = ({todo}:{todo:actions.TodoInput}) => {

    const [editTodo, setEditTodo] = useState(false);

    const handleEdit = () => {
        setEditTodo(!editTodo)
    }

    const handleSubmit = () => {
        setEditTodo(false)
    }

    return (
        <div className='flex gap-5 items-center'>
            <DefaultButton onClick={handleEdit} text={<MdEdit/>} actionButton/>

            {editTodo ? (
                <Form action={actions.updateTodo} onSubmit={handleSubmit}>
                    <div className="flex justify-center">
                        <Input name='id' type='hidden' value={String(todo.id)}></Input>
                        <Input name='title' type='text' placeholder='New Title ...'/>
                        <DefaultButton type='submit' text="Save"></DefaultButton>
                    </div>
                </Form>
            ):null}
        </div>
    )
}

export default EditTodo