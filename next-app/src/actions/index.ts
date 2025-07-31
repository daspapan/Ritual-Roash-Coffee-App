"use server"

import { revalidatePath } from "next/cache";
import {pool} from "@/utils/pg"


export interface TodoInput {
    id: string;
    title: string;
    description?: string;
    start_date?: Date;
    due_date?: Date;
    status: TodoStatus;
    priority: TodoPriority;
    assignee?: string;
    remark?: string;
}

export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export async function addTask(formData: FormData){
    console.log("Adding Task ...")
    console.log(JSON.stringify(formData, null, 2))
}

export async function getTodos():Promise<TodoInput[]>{

    const res = await pool.query("SELECT * FROM todos;");
    // console.log('Get Todos:', res.rows);
    return res.rows;

}

export async function createTodo(formData: FormData){

    console.log("Creating a new Task ...")
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const start_date = formData.get('start_date') as string;
    const due_date = formData.get('due_date') as string;
    const remark = formData.get('remark') as string;
    const status = 'TODO'
    const priority = 'LOW'
    const assignee = 'self'

    // console.log("[Input Received]", input)

    if(!title.trim()){
        return ;
    }

    const query = `
        INSERT INTO todos (
        title,
        description,
        start_date,
        due_date,
        status,
        priority,
        assignee,
        remark
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;

    const values = [
        title,
        description || null,
        start_date || null,
        due_date || null,
        status,
        priority,
        assignee,
        remark || null,
    ];

    try {
        const res = await pool.query(query, values);
        console.log('Inserted Todo:', res.rows[0]);
        return res.rows[0];
    } catch (error) {
        console.error('Error inserting todo:', error);
        throw error;
    } finally {
        revalidatePath("/")
    }

}

export async function updateTodo(formData: FormData){

    console.log("Update a Task ...")

    const id = formData.get('id') as string;
    const title = formData.get('title') as string;

    console.log(id, title)

    // Convert FormData to a plain object
    const formObject: Record<string, any> = Object.fromEntries(formData.entries());
    const fields = [];
    const values = [];
    let i = 1;

    // Now you can use Object.entries
    /* for (const [key, value] of Object.entries(formObject)) {
      console.log(`${key}: ${value}`);
    } */

    for (const [key, value] of Object.entries(formObject)) {
        if (key !== 'id' && value !== undefined) {
            fields.push(`${key} = $${i}`);
            values.push(value);
            i++;
        }
    }

    if (fields.length === 0) {
        console.log('No fields to update.');
        return;
    }

    const query = `
        UPDATE todos
        SET ${fields.join(', ')},
            updated_at = NOW()
        WHERE id = $${i}
        RETURNING *;
    `;
    values.push(id);
    

    try {

        const res = await pool.query(query, values);
        if (res.rows.length === 0) {
            console.log('No todo found with that ID.');
        } else {
            console.log('Updated Todo:', res.rows[0]);
            return res.rows[0];
        }
        
    } catch (error) {

        console.error('Error updating todo:', error);
        throw error;
        
    }finally {

        revalidatePath("/")
    }

}




export async function changeStatus(formData: FormData){

    console.log("Changing a Task ...")

    const todoId = formData.get('todoId') as string;

    console.log(todoId)


    revalidatePath("/")

}


export async function deleteTodo(formData: FormData){

    console.log("Deleting a Task ...")

    const id = formData.get('id') as string;

    const query = `
        DELETE FROM todos WHERE id = $1
        RETURNING *;
    `;

    const values = [id]

    try {

        const res = await pool.query(query, values);
        console.log('Delete Todo:', res.rows[0]);
        return res.rows[0];
        
    } catch (error) {

        console.error('Error deleting todo:', error);
        throw error;
        
    }finally {

        revalidatePath("/")
    }
}