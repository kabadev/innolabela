"use server";

import { clerkClient } from "@clerk/nextjs/server";

// CREATE
export async function createUser(
  firstName: string,
  lastName: string,
  email: string,
  role: string
) {
  try {
    const client = await clerkClient();

    await client.users.createUser({
      emailAddress: [email],
      firstName,
      lastName,
      publicMetadata: { role },
      password: `Civil@${firstName}`,
    });

    const { data } = await client.users.getUserList();
    const users = data?.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0].emailAddress,
      photo: user.imageUrl,
      role: user.publicMetadata.role,
    }));

    return { message: "User created successfully", success: true, users };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error creating user" };
  }
}

// READ
export async function getUsers() {
  try {
    const client = await clerkClient();

    const { data } = await client.users.getUserList({
      orderBy: "-created_at",
      limit: 500,
    });

    const users = data?.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0].emailAddress,
      photo: user.imageUrl,
      role: user.publicMetadata.role,
    }));

    return { message: "Users fetched successfully", success: true, users };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error fetching users" };
  }
}

//GET by ID
export async function getUserById(id: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(id);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.emailAddresses[0].emailAddress,
        photo: user.imageUrl,
        role: user.publicMetadata.role,
      },
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error fetching user" };
  }
}

// UPDATE
export async function updateUser(
  id: string,
  firstName: string,
  lastName: string,
  role: string
) {
  try {
    const client = await clerkClient();

    await client.users.updateUser(id, {
      firstName,
      lastName,
      publicMetadata: { role },
    });

    const { data } = await client.users.getUserList();
    const users = data?.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0].emailAddress,
      photo: user.imageUrl,
      role: user.publicMetadata.role,
    }));

    return { message: "User updated successfully", success: true, users };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error updating user" };
  }
}

// DELETE
export async function deleteUser(id: string) {
  try {
    const client = await clerkClient();

    await client.users.deleteUser(id);

    const { data } = await client.users.getUserList();
    const users = data?.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0].emailAddress,
      photo: user.imageUrl,
      role: user.publicMetadata.role,
    }));

    return { message: "User deleted successfully", success: true, users };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error deleting user" };
  }
}
