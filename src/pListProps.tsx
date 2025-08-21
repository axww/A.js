import { Post, Props } from "./base";

export interface pListProps extends Props {
    page: number
    pagination: number[]
    data: (typeof Post.$inferSelect & {
        name: string | null;
        grade: number | null;
        credits: number | null;
        quote_content: string | null;
        quote_name: string | null;
    })[]
}
