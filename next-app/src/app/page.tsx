

import { getEnvVar } from "@/actions";


export default async function Home() {

    const envvar= await getEnvVar();
    
    return (

        <>
            <main className="w-screen py-20 flex justify-center flex-col items-center">

                <h1 className="text-5xl font-extrabold uppercase mb-5 text-center">
                    <span className="lowercase">*</span>Fargate ToDo App - Demonstration
                </h1>

                <p className="w-full mx-auto px-4 text-center">{JSON.stringify(envvar, null, 2)}</p>
                
                
                {/* 
                
                <Link href={'/todos'}>
                    <span className="text-4xl font-extrabold uppercase">Todo App</span>
                </Link> */}

            </main> 

            {/* <div className="flex flex-col md:flex-row min-h-screen">
                
                <div className="flex-1 bg-blue-200 p-4">
                    <h2 className="text-xl font-bold">Row 1 Content</h2>
                    <p>This is the content for the first row.</p>
                </div>

                
                <div className="flex-1 bg-green-200 p-4">
                    <h2 className="text-xl font-bold">Row 2 Content</h2>
                    <p>This is the content for the second row.</p>
                </div>
            </div>*/}
        
        </>
    )
}