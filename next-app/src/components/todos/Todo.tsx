"use client"

import React, { useState } from 'react'
import ChangeTodo from './ChangeTodo'
import DeleteTodo from './DeleteTodo'
import EditTodo from './EditTodo'
import { TodoInput } from '@/actions'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'

interface todoProps {
    todo: TodoInput
}

const priorityColors = {
    HIGH: "bg-red-100 border-red-400",
    MEDIUM: "bg-yellow-100 border-yellow-400",
    LOW: "bg-green-100 border-green-400",
};

const Todo = ({todo}: todoProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className='w-full mx-auto flex items-center justify-center bg-slate-900 py-4 px-20 rounded-2xl'>

            <div>
                {/* Change Todo */}
                <ChangeTodo todo={todo} />
            </div>

            {/*  ${priorityColors[todo.priority]} */}
            <div className={`w-full border-l-4 p-4 rounded-xl mb-4 transition-all`}>

                {/* Left: Title & Description */}
                <div className="flex-1">
                    <h2 className="text-lg text-white text-center font-bold uppercase grow">{todo.title}</h2>
                    <p className="text-sm text-gray-100 line-clamp-2">{todo.description}</p>
                </div>

                {/* Right: Buttons */}
                <div className="flex items-center mt-2 sm:mt-0 gap-3">
                
                    <EditTodo todo={todo} />

                    <DeleteTodo todo={todo}/>

                    {todo.description && (
                        <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-500 hover:text-gray-800 transition"
                        title="Toggle Details"
                        >
                            {isExpanded ? <BiChevronUp size={18} /> : <BiChevronDown size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Collapsible Full Description */}
            {isExpanded && todo.description && (
                <div className="mt-3 text-sm text-gray-700 border-t pt-2">
                    {todo.description}
                </div>
            )}

        </div>
    )
}

export default Todo