import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignIn } from "@clerk/nextjs";
import { ReactNode } from "react";

export function LoginModal({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <div>{children}</div>
        </DialogTrigger>
        <DialogContent className="w-full p-0 md:max-w-[525px]">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
          <div className="flex mt-4 items-center justify-center">
            <SignIn routing="hash" />
          </div>
        </DialogContent>
      </form>
    </Dialog>
  );
}
