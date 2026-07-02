import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface Props{
    children:React.ReactNode;
}

export default function Layout({children}:Props){

    return(

        <div className="flex h-screen bg-gray-100">

            <Sidebar/>

            <div className="flex-1 flex flex-col">

                <Topbar/>

                <main className="flex-1 overflow-auto p-6">

                    {children}

                </main>

            </div>

        </div>

    );

}