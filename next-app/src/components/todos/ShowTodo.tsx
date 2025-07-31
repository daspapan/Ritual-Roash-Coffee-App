"use client"

import React, { useState } from 'react'
import * as actions from "@/actions"
import DefaultButton from '../button/DefaultButton'
import Todo from './Todo'
import { FaCheck } from 'react-icons/fa'

const ShowTodo = () => {

    const [todoList, setTodoList] = useState<actions.TodoInput[]>([])

    const handleRefresh = async () => {
        setTodoList(await actions.getTodos())
    }

    return (
        <>
            <button onClick={handleRefresh} style={{ padding: '10px 20px', fontSize: '16px' }}>
                {<FaCheck style={{ marginRight: '8px' }} />}
                Refresh
            </button>

            
                
            <div className="flex flex-col gap-5 items-center justify-center mt-10 w-screen px-4">
                {todoList.length == 0 && (
                    <div className="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300" role="alert">
                        <span className="font-medium">Alert!</span> Todo list is empty.
                    </div>
                )}

                {todoList && todoList.map((todo, id) => (
                    
                    <Todo key={id} todo={todo} />
                    
                ))}
            </div>
        </>
    )
}

export default ShowTodo