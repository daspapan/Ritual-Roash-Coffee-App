import React from 'react'
import * as actions from '@/actions/actions'
import { todo } from '@/generated/prisma'
import DefaultButton from '../button/DefaultButton'
import Input from '../input/Input'
import Form from '../form/Form'
import { FaCheck } from 'react-icons/fa'

interface ChangeTodoProps {
    todo: todo
}

const ChangeTodo = ({todo}:ChangeTodoProps) => {
    return (
        <Form action={actions.changeStatus}> 
            <Input name="todoId" value={String(todo.id)} type="hidden"></Input>
            <DefaultButton text={<FaCheck />} type={"submit"} actionButton={true} bgColor={todo.status === 'COMPLETED' ? "bg-green-400":"bg-blue-500"}></DefaultButton>
        </Form>
    )
}

export default ChangeTodo