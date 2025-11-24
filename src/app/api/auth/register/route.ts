import { PrismaClient, Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const allowedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'example.com'];
    const emailDomain = email.split('@')[1];

    if (!emailDomain || !allowedDomains.includes(emailDomain.toLowerCase())) {
      return NextResponse.json({ message: 'Please use a valid email address from an allowed provider (e.g., gmail.com, outlook.com).' }, { status: 400 });
    }

    const exist = await prisma.user.findUnique({
      where: { email },
    });

    if (exist) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'EMPLOYEE', // Default role
      },
    });

    // Also create an employee record
    await prisma.employee.create({
      data: {
        userId: user.id,
        staffNo: faker.string.alphanumeric(8).toUpperCase(),
        position: 'New Hire',
        department: 'Unassigned',
        salary: 0,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
