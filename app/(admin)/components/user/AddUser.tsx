"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useRouter } from "next/navigation";
import { createUser } from "@/app/actions/user";

const lawyerFormSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: "First name must be at least 2 characters." }),
  lastName: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  role: z.string().min(1, { message: "User role is required" }),
});

const AddUser = ({ onSubmitComplete }: any) => {
  const [addLawyerModalOpen, setAddLawyerModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof lawyerFormSchema>>({
    resolver: zodResolver(lawyerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
    },
  });
  const router = useRouter();

  const onSubmit = async (data: z.infer<typeof lawyerFormSchema>) => {
    try {
      setIsSubmitting(true);
      await createUser(data.firstName, data.lastName, data.email, data.role!);
      setAddLawyerModalOpen(false);
      form.reset();
      setIsSubmitting(false);
      onSubmitComplete();
      router.refresh();
    } catch (error) {
      console.error("Error adding user:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Button
        onClick={() => setAddLawyerModalOpen(true)}
        className="flex items-center gap-2 font-medium"
        size="default"
      >
        <Plus className="w-4 h-4" />
        Add New User
      </Button>

      <Sheet open={addLawyerModalOpen} onOpenChange={setAddLawyerModalOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-full px-4 sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl sm:px-6"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="pb-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl font-semibold">
                  Add New User
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Create a new user account and assign their role in the system.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="Enter first name"
                      className="h-10"
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Enter last name"
                      className="h-10"
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="Enter email address"
                    className="h-10"
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    User Role
                  </Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value) => form.setValue("role", value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Project Lead">Project Lead</SelectItem>
                      <SelectItem value="Technical Lead">
                        Technical Lead
                      </SelectItem>
                      <SelectItem value="Annotators">Annotators</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.role.message}
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="flex flex-col-reverse justify-end gap-3 pt-6 border-t sm:flex-row mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddLawyerModalOpen(false)}
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current rounded-full animate-spin border-t-transparent" />
                    Adding...
                  </div>
                ) : (
                  "Add User"
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AddUser;
