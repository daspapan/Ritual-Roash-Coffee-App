import React from 'react'
import ChangeTodo from './ChangeTodo'
import { todo } from '@/generated/prisma'
import DeleteTodo from './DeleteTodo'
import EditTodo from './EditTodo'

interface todoProps {
    todo: todo
}

const Todo = ({todo}: todoProps) => {
    return (
        <div className='w-10/12 mx-auto flex items-center justify-center bg-slate-900 py-4 px-20 rounded-2xl'>

            {/* Change Todo */}
            <ChangeTodo todo={todo} />

            <span className='text-white text-center font-bold uppercase grow'>{todo.title}</span>

            <div className='flex items-center mx-2'>
                <EditTodo todo={todo} />
            </div>

            <div className='flex items-center'>
                <DeleteTodo todo={todo}/>
            </div>

        </div>
    )
}

export default Todo