"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUser } from "@/app/actions/user";

const lawyerFormSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: "firstName must be at least 2 characters." }),
  lastName: z
    .string()
    .min(2, { message: "lastName must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  role: z.string().min(2, { message: " user role is required" }),
});

const EditUser = ({
  userData,
  isOpen,
  onClose,
  onSubmitComplete,
}: {
  userData: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmitComplete: () => void;
}) => {
  const form = useForm<z.infer<typeof lawyerFormSchema>>({
    resolver: zodResolver(lawyerFormSchema),
    defaultValues: {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onSubmit = async (data: z.infer<typeof lawyerFormSchema>) => {
    try {
      setIsSubmitting(true);
      await updateUser(userData.id, data.firstName, data.lastName, data.role);
      onClose();
      form.reset();
      setIsSubmitting(false);
      onSubmitComplete();
    } catch (error) {
      console.error("Error updating user:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full max-w-full px-4 sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl sm:px-6"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="space-y-3">
            <SheetTitle className="text-lg font-semibold sm:text-xl">
              Update User
            </SheetTitle>
            <SheetDescription className="text-sm sm:text-base text-muted-foreground">
              Update user information in the system.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-6"
          >
            <ScrollArea className="h-[calc(100vh-220px)] pr-2 sm:pr-4 sm:mb-4">
              <div className="space-y-6">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                    className="h-10"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    className="h-10"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    className="h-10"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role
                  </Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value) => form.setValue("role", value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a Role" />
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
                    <p className="text-sm text-destructive">
                      {form.formState.errors.role.message}
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Buttons */}
            <div className="flex flex-col-reverse justify-end gap-3 border-t sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Updating..." : "Update User"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EditUser;
