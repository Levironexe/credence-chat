import { motion } from "framer-motion";
import Image from "next/image";

export const Greeting = () => {
  return (
    <div
      className="mr-auto text-left flex max-w-3xl flex-col items-start justify-center px-4"
      key="overview"
    >
      <motion.div
        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-2xl mb-2 flex gap-2 items-center font-lora"
      >
        <Image
          alt="App logo"
          className="h-7 w-7"
          height={40}
          src="/images/logo/icon.svg"
          width={40}
        />
        Hello there!
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="text-[32px] font-lora"
      >
        Where should we start?
      </motion.div>
    </div>
  );
};