import Link from "next/link";

type Props = {
    id: string;
    title: string;
    description: string;
    category: string;
};

export default function TimelineCard({
    id,
    title,
    description,
    category,
}: Props) {
    return (
        <Link href={`/timeline/${id}`}>
            <div className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg hover:scale-[1.02] transition cursor-pointer">

                <p className="text-sm text-blue-500">{category}</p>

                <h2 className="text-xl font-semibold mt-2">{title}</h2>

                <p className="text-gray-600 mt-2 text-sm">
                    {description}
                </p>

            </div>
        </Link>
    );
}