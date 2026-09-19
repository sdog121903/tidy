import { addComment, deleteComment } from "@/app/actions";
import type { Comment } from "@/lib/data";
import { userName, type User } from "@/lib/users";
import { SubmitButton } from "./submit-button";
import { When } from "./when";

/** This week's comments between the admin and one person on one chore, plus a reply box. */
export function ChoreComments({
  choreId,
  comments,
  person,
  me,
}: {
  choreId: number;
  comments: Comment[];
  person: User;
  me: User;
}) {
  const isAdmin = me.id === "admin";
  const inputId = `comment-${choreId}-${person.id}`;
  return (
    <div className="t-thread">
      {comments.length > 0 && (
        <ul className="t-comments">
          {comments.map((m) => (
            <li key={m.id} className="t-comment" data-admin={m.author === "admin"}>
              <header>
                <span>{userName(m.author)}</span>
                <span className="t-when">
                  <When iso={m.at} />
                </span>
                {(isAdmin || m.author === me.id) && (
                  <form action={deleteComment}>
                    <input type="hidden" name="commentId" value={m.id} />
                    <SubmitButton className="t-link" aria-label={`Delete comment from ${userName(m.author)}`}>
                      Delete
                    </SubmitButton>
                  </form>
                )}
              </header>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form action={addComment} className="t-comment-form">
        <input type="hidden" name="choreId" value={choreId} />
        <input type="hidden" name="person" value={person.id} />
        <label htmlFor={inputId} className="t-sr">
          {isAdmin ? `Comment to ${person.name}` : "Write a message"}
        </label>
        <input
          id={inputId}
          name="body"
          required
          maxLength={1000}
          placeholder={isAdmin ? "e.g. Hey, you didn't do this one" : "Write a message…"}
          className="t-input"
        />
        <SubmitButton className="t-pill t-pill--ink">Send</SubmitButton>
      </form>
    </div>
  );
}
