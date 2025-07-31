import React from 'react'
import DefaultButton from '../button/DefaultButton'
import * as actions from '@/actions'
import Form from '../form/Form'
import Input from '../input/Input'
import { FaTrash } from 'react-icons/fa'

const DeleteTodo = ({todo}:{todo:actions.TodoInput}) => {

    return (
        <Form action={actions.deleteTodo}>
            <Input name='id' type='hidden' value={String(todo.id)}></Input>
            <DefaultButton type='submit' bgColor='bg-red-400' text={<FaTrash/>} actionButton/>
        </Form>
    )
}

export default DeleteTodo