"use client";


import { useState } from "react";


export default function UploadTestPage(){


    const [file,setFile] = useState(null);


    async function uploadFile(){


        if(!file){

            alert("Select a file first");

            return;

        }


        const formData = new FormData();


        formData.append(
            "file",
            file
        );



        const response = await fetch(
            "/api/upload-test",
            {

                method:"POST",

                body:formData

            }
        );



        const result = await response.json();


        console.log(result);


        if(result.success){

            alert("Upload successful");

        }

        else{

            alert(result.error);

        }

    }



    return (

        <div style={{padding:"30px"}}>

            <h1>
                CNCS LMS Upload Test
            </h1>


            <input

                type="file"

                onChange={
                    (e)=>setFile(
                        e.target.files[0]
                    )
                }

            />


            <br/><br/>


            <button

                onClick={uploadFile}

            >

                Upload

            </button>


        </div>

    );


}