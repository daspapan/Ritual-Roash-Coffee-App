"use client"

import React, { ChangeEvent, useState } from 'react'
import ChangeTodo from './ChangeTodo'
import DeleteTodo from './DeleteTodo'
import EditTodo from './EditTodo'
import { deleteTodo, TodoInput, updateTodo, uploadAttachment } from '@/actions'
import { BiChevronDown, BiChevronUp } from 'react-icons/bi'
import { motion, AnimatePresence } from 'framer-motion'
import Input from '../input/Input'
import Form from '../form/Form'
import ViewAttachment from './ViewAttachment'
import UploadAttachment from './UploadAttachment'
import { Delete, Trash } from 'lucide-react'

interface todoProps {
    todo: TodoInput
}

const priorityColors = {
    HIGH: "accent-amber-800",
    MEDIUM: "accent-green-500",
    LOW: "accent-cyan-100",
};

const Todo = ({todo}: todoProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState<Boolean>(false);
    const [isShowAttachment, setIsShowAttachment] = useState<Boolean>(false);


    return (
        <>
            <div className="w-full max-w-lg p-4 bg-white shadow-md rounded-2xl flex flex-col gap-3 border">
                {/* Top Row: Checkbox + Title */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={todo.status === "DONE"}
                            onChange={() => {}}
                            className={`h-5 w-5 cursor-pointer ${priorityColors[todo.priority]}`}
                        />
                        {/* //  === "MEDIUM" ? "accent-green-500" : ""} ${todo.priority === "HIGH" ? "bg-orange-500" : "" */}
                        <h3
                            className={`font-semibold text-lg ${
                            todo.status === "DONE" ? "line-through text-gray-400" : ""
                            }`}
                        >
                            {todo.title}
                        </h3>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {todo.assignee && 
                            <button
                                onClick={() => {setIsShowAttachment(!isShowAttachment); setIsEditing(false)}}
                                className="px-2 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                {isShowAttachment ? "Hide Attachment":"Show Attachment"}
                            </button>
                        }
                        <button
                            onClick={() => {setIsEditing(!isEditing); setIsShowAttachment(false);}}
                            className="px-2 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            {isEditing ? "Cancel" : "Edit"}
                        </button>
                        <form action={deleteTodo}>
                            <input
                                type="text"
                                name="id"
                                value={todo.id}
                                className="border rounded-lg px-3 py-2"
                                hidden
                                readOnly
                            />
                            <button
                                onClick={() => {}}
                                className="inline-flex items-center justify-center px-2 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                <Trash size={14} className="mr-1" />
                                Delete
                            </button>
                        </form>
                    </div>
                </div>

                {/* Description */}
                {!isEditing && (
                    <p className="text-gray-600 text-sm line-clamp-2">{todo.description}</p>
                )}

                {/* Collapsible Attachment */}
                
                <AnimatePresence>
                    {isShowAttachment && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-2 p-2 gap-2 bg-gray-100 rounded-lg"
                        >
                            
                            {todo.attachment && <ViewAttachment todo={todo} />}

                            <UploadAttachment todo={todo}/>

                        </motion.div>
                    )}
                </AnimatePresence>
                    


                {/* Edit Form */}
                <EditTodo todo={todo} isEditing={isEditing} />

                
            </div>

            
        </>
    )
}

export default Todo