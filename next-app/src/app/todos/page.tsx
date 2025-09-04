import React from 'react'
import * as actions from '@/actions';
import AddTodo from '@/components/todos/AddTodo'
import Todo from "@/components/todos/Todo";
import Link from 'next/link';
import { HiRefresh } from 'react-icons/hi';
import DefaultButton from '@/components/button/DefaultButton';
import ShowTodo from '@/components/todos/ShowTodo';
import UploadTodo from '@/components/todos/UploadAttachment';
import NavBar from '@/components/navbar/NavBar';
import { NextPage } from 'next';


type PageProps = {
    params?: Promise<Record<string, string | string[] | undefined>>; // For dynamic routes
    searchParams?: Promise<Record<string, string | string[] | undefined>>; // For URL query parameters
};

const TodosPage: NextPage<PageProps> = async ({ params, searchParams }) => {
// export default async function TodosPage({ searchParams }: PageProps) { //  { searchParams: { page?: string } }

    const currentPage = await searchParams;
    // console.log("[CURRENT PAGE]", currentPage)
    const todoList: actions.TodoInput[] = await actions.getTodos();

    // let todoList: actions.TodoInput[] = await actions.getTodos();
    // console.log(todoList)


    return (

        <main className="flex flex-col md:flex-row min-h-screen">
                
            <div className="flex-1 p-4">
                <AddTodo /> 
            </div>

            
            <div className="flex-1 p-4">
                <ShowTodo todoList={todoList} />
            </div>

        </main>

    )
}

export default TodosPage