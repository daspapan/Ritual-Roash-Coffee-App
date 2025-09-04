'use client'

import React, { useState } from 'react'
import DefaultButton from '../button/DefaultButton';
import { MdEdit } from 'react-icons/md';
import Input from '../input/Input';
import Form from '../form/Form';
import * as actions from '@/actions'
import { motion, AnimatePresence } from 'framer-motion'

type EditTodoProps = {
    isEditing: Boolean;
    todo: actions.TodoInput;
}

const EditTodo = ({todo, isEditing}:EditTodoProps) => {

    const [editTodo, setEditTodo] = useState(false);
    const [editData, setEditData] = useState<actions.TodoInput>(todo)

    const handleEdit = () => {
        setEditTodo(!editTodo)
    }

    const handleSubmit = () => {
        setEditTodo(false)
    }

    return (

        <Form action={actions.updateTodo}>
            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col gap-2 mt-2"
                    >
                    

                        <input
                            type="text"
                            name="id"
                            value={editData.id}
                            className="border rounded-lg px-3 py-2"
                            hidden
                            readOnly
                        />

                        {/* 
                        <input
                            type="text"
                            name="content_type"
                            value={contentType}
                            className="border rounded-lg px-3 py-2"
                            placeholder="Attached file type."
                            hidden
                            readOnly
                        />

                        <input
                            type="text"
                            name="fileName"
                            value={filename}
                            className="border rounded-lg px-3 py-2"
                            placeholder="Attached file name."
                            hidden
                            readOnly
                        /> 

                        <input
                            type="text"
                            name="storage"
                            value={process.env.FILE_STORAGE}
                            className="border rounded-lg px-3 py-2"
                            placeholder="Attached file storage."
                            hidden
                            readOnly
                        /> */}



                        <input
                            type="text"
                            name='title'
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            className="border rounded-lg px-3 py-2"
                            placeholder="Update title"
                            hidden
                            readOnly
                        />

                        <label htmlFor="description">Descriptions: </label>
                        <textarea
                            id='description'
                            name='description'
                            value={editData.description}
                            onChange={(e) =>
                                setEditData({ ...editData, description: e.target.value })
                            }
                            className="border rounded-lg px-3 py-2"
                            placeholder="Update description"
                            rows={3}
                        />

                        <p>Update Status:</p>

                        <div className="flex">
                            <div className="w-1/3">
                                <input 
                                    id="todo" 
                                    name="status" 
                                    type="radio" 
                                    value="TODO" 
                                    defaultChecked={editData.status === "TODO"}
                                    className='mr-1'
                                />
                                <label htmlFor="todo">
                                    To be done.
                                </label>
                            </div>
                            <div className="w-1/3">
                                <input 
                                    id="in_progress" 
                                    name="status" 
                                    type="radio" 
                                    value="IN_PROGRESS"
                                    defaultChecked={editData.status === "IN_PROGRESS"}
                                    className='mr-1'
                                />
                                <label htmlFor="in_progress">Work In Progress</label>
                            </div>
                            <div className="w-1/3">
                                <input 
                                    id="done" 
                                    name="status" 
                                    type="radio" 
                                    value="DONE"
                                    defaultChecked={editData.status === "DONE"}
                                    className='mr-1'
                                />
                                <label htmlFor="done">Finished</label>
                            </div>
                        </div>


                        <p>Update Priority:</p>
                        <div className="flex">
                            <div className="w-1/3">
                                <input 
                                    id="low" 
                                    name="priority" 
                                    type="radio" 
                                    value="LOW" 
                                    defaultChecked={editData.priority === "LOW"}
                                    className='mr-1'
                                />
                                <label htmlFor="low">Low</label>
                            </div>
                            <div className="w-1/3">
                                <input 
                                    id="medium" 
                                    name="priority" 
                                    type="radio" 
                                    value="MEDIUM"
                                    defaultChecked={editData.priority === "MEDIUM"}
                                    className='mr-1'
                                />
                                <label htmlFor="medium">Medium</label>
                            </div>
                            <div className="w-1/3">
                                <input 
                                    id="high" 
                                    name="priority" 
                                    type="radio" 
                                    value="HIGH"
                                    defaultChecked={editData.priority === "HIGH"}
                                    className='mr-1'
                                />
                                <label htmlFor="high">High</label>
                            </div>
                        </div>

                        {/* 
                        
                        
                        <input type="radio" id="bank-transfer" name="status" value="bank-transfer">
                        <label htmlFor="bank-transfer">Bank Transfer</label> */}

                        <label htmlFor="remark">Remarks: </label>
                        <textarea
                            id='remark'
                            name='remark'
                            value={editData.remark}
                            onChange={(e) =>
                                setEditData({ ...editData, remark: e.target.value })
                            }
                            className="border rounded-lg px-3 py-2"
                            placeholder="Update description"
                            rows={3}
                        />

                        <button
                            onClick={() => {console.log("handle save")}}
                            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                            Update Todo
                        </button>
                    
                    

                    </motion.div>
                )}
            </AnimatePresence>
        </Form>

       
    )
}

export default EditTodo