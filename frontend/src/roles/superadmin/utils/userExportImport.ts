import { User } from '../types/school';

export function generateCsv(users: User[]): string {
  // Define CSV headers
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

  // Convert users to CSV rows
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

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export interface CsvUser {
  name: string;
  email: string;
  role: string;
  subjects?: string;
  classes?: string;
  class?: string;
  rollNumber?: string;
}

export function parseCsvFile(file: File): Promise<CsvUser[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(header => 
          header.trim().toLowerCase().replace(/["\r]/g, '')
        );

        const users: CsvUser[] = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(value => 
              value.trim().replace(/["\r]/g, '')
            );
            const user: any = {};
            headers.forEach((header, index) => {
              if (header === 'subjects' || header === 'classes') {
                user[header] = values[index] ? values[index].split(';') : [];
              } else {
                user[header] = values[index];
              }
            });
            return user as CsvUser;
          });

        resolve(users);
      } catch (err) {
        reject(new Error('Failed to parse CSV file. Please check the format.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
