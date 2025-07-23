import React from 'react'
import DefaultButton from '../button/DefaultButton'
import { todo } from '@/generated/prisma'
import * as actions from '@/actions/actions'
import Form from '../form/Form'
import Input from '../input/Input'
import { FaTrash } from 'react-icons/fa'

const DeleteTodo = ({todo}:{todo:todo}) => {

    return (
        <Form action={actions.deleteTodo}>
            <Input name='id' type='hidden' value={String(todo.id)}></Input>
            <DefaultButton type='submit' bgColor='bg-red-400' text={<FaTrash/>} actionButton/>
        </Form>
    )
}

export default DeleteTodo