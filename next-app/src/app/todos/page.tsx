import React from 'react'
import * as actions from '@/actions';
import AddTodo from '@/components/todos/AddTodo'
import Todo from "@/components/todos/Todo";
import Link from 'next/link';
import { HiRefresh } from 'react-icons/hi';
import DefaultButton from '@/components/button/DefaultButton';
import ShowTodo from '@/components/todos/ShowTodo';

const TodoPage = async () => {

    let data: actions.TodoInput[] = []
    


    return (
         <main className="w-screen py-20 flex justify-center flex-col items-center">
            <Link href={'/'}>
                <span className="text-4xl font-extrabold uppercase">Home Page</span>
            </Link>
            
            <div className="flex justify-center flex-col items-center">

                <AddTodo />

                <hr className="w-48 h-1 mx-auto my-4 bg-gray-100 border-0 rounded-sm md:my-10 dark:bg-gray-700"/>

                <ShowTodo />
                
                
            </div>

            
            
        </main>
    )
}

export default TodoPage