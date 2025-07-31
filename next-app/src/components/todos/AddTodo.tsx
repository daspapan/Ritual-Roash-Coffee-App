import React from 'react'
import Form from '../form/Form'
import Input from '../input/Input'
import DefaultButton from '../button/DefaultButton'
import { createTodo } from '@/actions'

interface AddTodoProps {
    name?:string
}

const AddTodo = ({}:AddTodoProps) => {
    return (
        <div>
            <Form action={createTodo}>
                <div className='flex gap-2'>
                    <Input name='title' type='text' placeholder='Add Title Here... '/>
                    <Input name='description' type='textarea' placeholder='Add Description Here... '/>
                    <Input name='start_date' type='date' placeholder='Add start date Here... '/>
                    <Input name='due_date' type='date' placeholder='Add due date Here... '/>
                    <Input name='remark' type='textarea' placeholder='Add Remark Here... '/>
                    <DefaultButton type='submit' text="Add" bgColor='bg-blue-600'/>
                </div>
            </Form>
        </div>
    )
}

export default AddTodo