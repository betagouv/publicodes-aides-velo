import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
  try {
    const inputs = {
      token: core.getInput("token"),
      issueNumber: Number(core.getInput("issue-number")),
      comment: core.getInput("comment"),
    };

    const repository = process.env.GITHUB_REPOSITORY;
    const [owner, repo] = repository.split("/");

    const octokit = github.getOctokit(inputs.token);

    core.info("Updating the issue");
    const now = new Date();
    await octokit.rest.issues.update({
      owner: owner,
      repo: repo,
      issue_number: inputs.issueNumber,
      state: "open",
      body:
        "_Une fois par semaine, une GH Action vient mettre à jour cette issue avec la liste des liens cassés et des aides expirées._\n\n" +
        "### Liens invalides au " +
        new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Europe/Paris",
          dateStyle: "long",
        }).format(now) +
        "\n" +
        inputs.comment.replace(/<br \/>/g, `\n`),
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
