import React from 'react'
import * as actions from '@/actions'
// import { todo } from '@/generated.bak/prisma'
import DefaultButton from '../button/DefaultButton'
import Input from '../input/Input'
import Form from '../form/Form'
import { FaCheck } from 'react-icons/fa'

interface ChangeTodoProps {
    todo: actions.TodoInput
}

const ChangeTodo = ({todo}:ChangeTodoProps) => {
    return (
        <Form action={actions.updateTodo}> 
            <Input name="id" value={String(todo.id)} type="hidden"></Input>
            <Input name="status" value={todo.status === 'DONE' ? 'IN_PROGRESS':'DONE'} type='hidden'></Input>
            <DefaultButton text={<FaCheck />} type={"submit"} actionButton={true} bgColor={todo.status === 'DONE' ? "bg-green-400":"bg-blue-500"}></DefaultButton>
        </Form>
    )
}

export default ChangeTodo