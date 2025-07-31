
import AddTodo from "@/components/todos/AddTodo"

import { pool } from "@/utils/pg";

import DefaultButton from "@/components/button/DefaultButton";
import Link from "next/link";


export default async function Home() {




    

    
    return (
        <main className="w-screen py-20 flex justify-center flex-col items-center">
            <h1 className="text-5xl font-extrabold uppercase mb-5 text-center">
                <span className="lowercase">w/</span>Server Actions
            </h1>
            
            <Link href={'/todos'}>
            
                <span className="text-4xl font-extrabold uppercase">Todo App</span>
            </Link>
        </main>
    )
}