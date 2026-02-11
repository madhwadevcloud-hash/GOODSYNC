import { User } from '../types/school';

export function filterUsers(
  users: User[],
  searchTerm: string,
  role: string,
  status: string
): User[] {
  return users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = role === 'all' || user.role === role;
    const matchesStatus = status === 'all' || user.status === status;

    return matchesSearch && matchesRole && matchesStatus;
  });
}

export function handleExportUsers(users: User[]): void {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const filename = `users_export_${timestamp}.csv`;

  // Define CSV headers and content
  const headers = [
    'Name',
    'Email',
    'Role',
    'Status',
    'Join Date',
    'Subjects',
    'Classes',
    'Class',
    'Roll Number'
  ];

  const rows = users.map(user => [
    user.name,
    user.email,
    user.role,
    user.status,
    user.joinDate,
    user.subjects?.join(';') || '',
    user.classes?.join(';') || '',
    user.class || '',
    user.rollNumber || ''
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
