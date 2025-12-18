'use client';
import {useUserStore,waitForUserStoreReady,checkUserExists} from "taimidanseo/features/users/user-store"
import {User} from "taimidanseo/features/users/user-models"
import React, { use } from "react"
import {useEffect} from "react"
export const UserCreator = () => {
    const currentUser: User | null = useUserStore((state) => state.currentUser);
    const [stateHydrated,setStateHydrated]=React.useState(false);
    const [createNewUser,setCreateNewUser]=React.useState(false);
    const [newUserName,setNewUserName]=React.useState(""); 
    const [newUserEmail,setNewUserEmail]=React.useState("");
    useEffect(() => {
        async function loadUser() {
            await waitForUserStoreReady();
            setStateHydrated(true);
            if (!currentUser) {
                var ready=await checkUserExists();
                if(ready){
                    console.log("User exists and loaded")
                }
            }
        }
        loadUser();
    }, []);
    useEffect(() => {
        if(currentUser){
            setCreateNewUser(false);
        }
        else{
            setCreateNewUser(true);
        }
    }, [currentUser]);
    const createUser=()=> {
        if(newUserName.trim().length===0){
            alert("Name cannot be empty");
            return;
        }
        const newUser: User = {
                            id: crypto.randomUUID(),
                            name: newUserName,
                            email: newUserEmail.trim().length>0 ? newUserEmail : undefined,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            userIPs: [],};
        useUserStore.getState().setCurrentUser(newUser);
       
    };

    //if no user exists and state is hydrated, show a component to create a new user
    if(stateHydrated && createNewUser){
        return (
            <div className="flex flex-col items-center justify-center p-4 border rounded-md shadow-md bg-white">
                <h2 className="text-2xl font-bold mb-4">Create New User</h2>
                <input
                    type="text"
                    placeholder="Name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="mb-2 p-2 border rounded w-full"
                />
                <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}   
                    className="mb-4 p-2 border rounded w-full"
                />
                <button
                    onClick={async () => {
                     
                        createUser();
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Create User
                </button>
            </div>
        );
    }
   return null;
};
//component to display current user name in header
export const UserHeaderDisplay = () => {
    const currentUser = useUserStore((state) => state.currentUser);
    return <header className="text-white">Hello {currentUser?.name}</header>;
};