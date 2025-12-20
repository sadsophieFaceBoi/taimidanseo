import Image from "next/image";
import { GoogleMapComponent } from "taimidanseo/features/maps/components/google-map";

export default function Home() {
  return (
    <div className="flex  bg-zinc-50 font-sans  border-amber-700 border-2 items-start justify-items-start justify-start">
      <main className="flex  w-full max-w-3xl flex-col   bg-white dark:bg-gray-500 ">
        <GoogleMapComponent />
      </main>
    </div>
  );
}
