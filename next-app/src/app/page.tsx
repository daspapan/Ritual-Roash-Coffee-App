
import AddTodo from "@/components/todos/AddTodo"
import Todo from "@/components/todos/Todo";
import { prisma } from "@/utils/prisma"

async function getTodos() {

    const data = await prisma.todo.findMany({
        select: {
            title: true,
            id: true,
            status: true,
        },
        orderBy: {
            created_at: "desc"
        }
    })

    return data;
    
}

export default async function Home() {

    const data = await getTodos();

    
    return (
        <main className="w-screen py-20 flex justify-center flex-col items-center">
            <span className="text-4xl font-extrabold uppercase">Todo App</span>
            <h1 className="text-5xl font-extrabold uppercase mb-5 text-center">
                <span className="lowercase">w/</span>Server Actions
            </h1>
            <div className="flex justify-center flex-col items-center">

                <AddTodo />

                <hr className="w-48 h-1 mx-auto my-4 bg-gray-100 border-0 rounded-sm md:my-10 dark:bg-gray-700"/>

                <div className="flex flex-col gap-5 items-center justify-center mt-10 w-screen">
                    {data.length == 0 && (
                        <div className="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300" role="alert">
                            <span className="font-medium">Alert!</span> Todo list is empty.
                        </div>
                    )}

                    {data && data.map((todo, id) => (
                        <div key={id}>
                            <Todo todo={todo} />
                        </div>
                    ))}
                </div>
            </div>

            
            
        </main>
    )
}