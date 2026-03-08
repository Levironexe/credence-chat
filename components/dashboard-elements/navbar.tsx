import React from "react";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const router = useRouter();

  return (
    <div className="w-full">
      <span
        onClick={() => {
          router.push("/");
          router.refresh();
        }}
        className="cursor-pointer font-lora rounded-[14px] p-2 font-semibold text-xl"
      >
        Credence
      </span>
    </div>
  );
};

export default Navbar;
