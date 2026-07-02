import { useAuth } from "../../../auth/AuthContext";

export default function Topbar(){

const {user}=useAuth();

return(

<div className="h-16 bg-white border-b flex justify-between items-center px-6">

<div>

<h1 className="text-2xl font-bold">

Student Portal

</h1>

</div>

<div>

{user?.name}

</div>

</div>

);

}