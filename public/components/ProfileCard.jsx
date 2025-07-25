import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function PersonProfile({ person }) {
  if (!person) return <div>לא נמצאו נתונים</div>;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString("he-IL") : "";

  return (
    <Card className="max-w-3xl mx-auto p-6 shadow-xl rounded-2xl bg-white dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <Avatar className="w-24 h-24">
          <AvatarImage src={person.image || "/placeholder.jpg"} alt={person.name} />
          <AvatarFallback>{person.name?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{person.name}</h2>
          <p className="text-sm text-gray-600">{person.gender === 'M' ? 'זכר' : 'נקבה'}</p>
        </div>
      </div>

      <Separator className="my-4" />

      <CardContent className="space-y-2">
        {person.birthDate && <p>נולד/ה: {formatDate(person.birthDate)}</p>}
        {person.birthPlace && <p>מקום לידה: {person.birthPlace}</p>}
        {person.deathDate && <p>נפטר/ה: {formatDate(person.deathDate)}</p>}
        {person.deathPlace && <p>מקום פטירה: {person.deathPlace}</p>}

        {person.spouse && (
          <p>בן/בת זוג: {person.spouse.name}</p>
        )}
        {person.children?.length > 0 && (
          <p>ילדים: {person.children.map(c => c.name).join(", ")}</p>
        )}
        {person.parents?.length > 0 && (
          <p>הורים: {person.parents.map(p => p.name).join(", ")}</p>
        )}
        {person.siblings?.length > 0 && (
          <p>אחים/ות: {person.siblings.map(s => s.name).join(", ")}</p>
        )}

        {person.notes && (
          <div className="mt-4 text-gray-700 dark:text-gray-300">
            <strong>הערות:</strong>
            <p>{person.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
