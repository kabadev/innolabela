"use client";

import { useEffect, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import type { User } from "@/types/user";

import { useRouter } from "next/navigation";

import AddUser from "../../components/user/AddUser";
import EditUser from "../../components/user/EditUser";
import { User } from "@/lib/type";
import { deleteUser, getUsers } from "@/app/actions/user";

export default function UsersTable() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [submited, setSubmited] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToUpdate, setUserToUpdate] = useState<User | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleDelete = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setUserToUpdate(user);
    setEditDialogOpen(true);
  };

  const closeEditModal = () => {
    setEditDialogOpen(false);
    setUserToUpdate(null);
  };

  const onSubmit = () => {
    setSubmited(!submited);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        setIsSubmiting(true);
        await deleteUser(userToDelete);
        setUserToDelete(null);
        setDeleteDialogOpen(false);
        setIsSubmiting(false);
        setSubmited(!submited);
      } catch (error) {
        console.error("Error deleting user:", error);
        setIsSubmiting(false);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const users = await getUsers();

        setUsers(users.users!);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchData();
  }, [submited]);

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email.toLowerCase();
    const query = searchQuery.toLowerCase();

    return fullName.includes(query) || email.includes(query);
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number.parseInt(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="container p-2 md:p-4 mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage your team members and their roles
          </p>
        </div>
        <AddUser onSubmitComplete={onSubmit} />
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {userToUpdate && (
        <EditUser
          userData={userToUpdate}
          isOpen={editDialogOpen}
          onClose={closeEditModal}
          onSubmitComplete={onSubmit}
        />
      )}

      <div className="block space-y-4 md:hidden">
        {loading
          ? [1, 2, 3, 4, 5].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-muted"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-3/4 h-4 rounded bg-muted"></div>
                      <div className="w-1/2 h-3 rounded bg-muted"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : currentUsers.map((user) => (
              <Card key={user.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage
                          src={user.photo || "/placeholder.svg"}
                          alt={user.firstName + " " + user.lastName}
                        />
                        <AvatarFallback>
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h3 className="font-semibold leading-none">
                          {user.firstName + " " + user.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-8 h-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(user.id)}
                          className="cursor-pointer text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right w-[100px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? [1, 2, 3, 4, 5, 6].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="w-10 h-10 rounded-full animate-pulse bg-muted"></div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="w-32 h-4 rounded animate-pulse bg-muted"></div>
                          </TableCell>
                          <TableCell>
                            <div className="w-40 h-4 rounded animate-pulse bg-muted"></div>
                          </TableCell>
                          <TableCell>
                            <div className="w-20 h-4 rounded animate-pulse bg-muted"></div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="w-8 h-8 ml-auto rounded animate-pulse bg-muted"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    : currentUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Avatar className="w-10 h-10">
                              <AvatarImage
                                src={user.photo || "/placeholder.svg"}
                                alt={user.firstName + " " + user.lastName}
                              />
                              <AvatarFallback>
                                {user.firstName?.[0]}
                                {user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.firstName + " " + user.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.role}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="w-8 h-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => handleEdit(user)}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user.id)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 pt-4 sm:flex-row">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
              {searchQuery && (
                <span className="ml-1">
                  (filtered from {users.length} total)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="sr-only">Previous page</span>
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center">
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-1 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && filteredUsers.length === 0 && searchQuery && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            No users found matching "{searchQuery}"
          </p>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this user?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone. This will permanently delete the
              user's account and remove their data from our servers.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={confirmDelete}
              variant="destructive"
              disabled={isSubmiting}
            >
              {isSubmiting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
